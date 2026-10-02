import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrancy_bonus mutant m8ead4462 test", function () {
  it("should detect removal of reentrancy guard by allowing reentrant withdrawal", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("Reentrancy_bonus");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy attacker contract that will re-enter withdrawReward
    const AttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await AttackerFactory.deploy(await instance.getAddress());
    await attackerContract.waitForDeployment();

    // Fund the contract with enough ETH for multiple bonus claims
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Call getFirstWithdrawalBonus on the attacker contract
    // This triggers the reentrancy attack
    const tx = instance.connect(attacker).getFirstWithdrawalBonus(await attackerContract.getAddress());

    // The original contract would revert due to reentrancy guard
    // The mutant allows the attack to succeed, draining funds
    await expect(tx).to.be.revertedWith("Reentrancy attack failed"); // This will pass on mutant, fail on original
  });
});

// Helper contract for reentrancy attack
contract ReentrancyAttacker {
    address public target;
    uint public attackCount = 0;

    constructor(address _target) {
        target = _target;
    }

    receive() external payable {
        if (attackCount < 3) {
            attackCount++;
            // Re-enter withdrawReward
            (bool success, ) = target.call(
                abi.encodeWithSignature("withdrawReward(address)", address(this))
            );
            require(success, "Reentrancy attack failed");
        }
    }
}