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

    // Deploy Attacker contract that will call airDrop
    const AttackerFactory = await ethers.getContractFactory("Attacker");
    const attacker = await AttackerFactory.deploy(await instance.getAddress());
    await attacker.waitForDeployment();

    // Call airDrop through the attacker contract - should revert
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