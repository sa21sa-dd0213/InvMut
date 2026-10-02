import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrancy_bonus mutant m7fc86598 test", function () {
  it("should revert when withdrawing to a contract that rejects ETH (require(success) check)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrancy_bonus");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a contract that reverts on ETH reception
    const RejectorFactory = await ethers.getContractFactory("contracts/Rejector.sol:Rejector");
    const rejector = await RejectorFactory.deploy();
    await rejector.waitForDeployment();

    // First, give addr1 a reward by calling getFirstWithdrawalBonus
    await instance.connect(addr1).getFirstWithdrawalBonus(addr1.address);
    
    // Now try to withdraw to the rejecting contract address (should revert in original, succeed in mutant)
    await expect(
      instance.connect(addr1).withdrawReward(await rejector.getAddress())
    ).to.be.reverted;
  });
});