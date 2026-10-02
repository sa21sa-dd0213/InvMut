import { expect } from "chai";
import { ethers } from "hardhat";

describe("ModifierEntrancy mutant detection - mdbb0f758", function () {
  it("should revert when calling airDrop with zero balance on the mutant (<= check)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Bank contract (needed by supportsToken modifier)
    const BankFactory = await ethers.getContractFactory("Bank");
    const bank = await BankFactory.deploy();
    await bank.waitForDeployment();
    
    // Deploy ModifierEntrancy - no constructor arguments needed
    const ModifierEntrancyFactory = await ethers.getContractFactory("ModifierEntrancy");
    const instance = await ModifierEntrancyFactory.deploy();
    await instance.waitForDeployment();
    
    // addr1 has zero balance initially - hasNoBalance modifier will pass
    // supportsToken modifier requires msg.sender to be a Bank contract
    // We need to call from the bank contract address to satisfy the modifier
    // But the test must call from an EOA - let's check the modifiers
    
    // The supportsToken modifier checks: keccak256("Nu Token") == Bank(msg.sender).supportsToken()
    // This means msg.sender must be a contract that implements supportsToken()
    // We'll deploy a simple contract that calls airDrop
    
    const AttackerFactory = await ethers.getContractFactory("Attacker");
    const attacker = await AttackerFactory.deploy(await instance.getAddress());
    await attacker.waitForDeployment();
    
    // Call airDrop through the attacker contract
    await expect(attacker.callAirDrop()).to.be.reverted;
  });
});

// Helper contract to satisfy the supportsToken modifier
contract Attacker {
    ModifierEntrancy public target;
    
    constructor(address _target) {
        target = ModifierEntrancy(_target);
    }
    
    function supportsToken() external pure returns (bytes32) {
        return keccak256(abi.encodePacked("Nu Token"));
    }
    
    function callAirDrop() external {
        target.airDrop();
    }
}