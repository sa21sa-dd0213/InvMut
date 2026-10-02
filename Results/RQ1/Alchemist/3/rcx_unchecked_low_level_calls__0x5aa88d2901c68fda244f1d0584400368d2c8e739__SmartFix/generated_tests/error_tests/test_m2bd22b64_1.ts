import { expect } from "chai";
import { ethers } } from "hardhat";

describe("MultiplicatorX3 - Kill mutant m2bd22b64", function () {
  it("should revert when overflow would occur in multiplicate due to require check", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the contract with some initial balance
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });
    
    // Prepare to call multiplicate with a value that would cause overflow
    // We need msg.value such that address(this).balance + msg.value > 2^256 - 1
    // Current contract balance is 1 ether, so we need msg.value close to max uint256
    const maxUint256 = ethers.MaxUint256;
    const currentBalance = await ethers.provider.getBalance(await instance.getAddress());
    const overflowValue = maxUint256 - currentBalance + 1n;
    
    // This should revert in the original contract due to require check
    await expect(
      instance.connect(owner).multiplicate(attacker.address, { value: overflowValue })
    ).to.be.reverted;
  });
});