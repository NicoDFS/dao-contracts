// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

interface IDAOSettings {
    function setStringParameter(string calldata category, string calldata key, string calldata value) external;
    function setNumericParameter(string calldata category, string calldata key, uint256 value) external;
    function setBoolParameter(string calldata category, string calldata key, bool value) external;
}

contract MockTimelockWithFunction {
    // This mock contract includes functions to call the DAOSettings
    
    function callSetStringParameter(
        address daoSettings,
        string calldata category,
        string calldata key,
        string calldata value
    ) external {
        IDAOSettings(daoSettings).setStringParameter(category, key, value);
    }
    
    function callSetNumericParameter(
        address daoSettings,
        string calldata category,
        string calldata key,
        uint256 value
    ) external {
        IDAOSettings(daoSettings).setNumericParameter(category, key, value);
    }
    
    function callSetBoolParameter(
        address daoSettings,
        string calldata category,
        string calldata key,
        bool value
    ) external {
        IDAOSettings(daoSettings).setBoolParameter(category, key, value);
    }
} 