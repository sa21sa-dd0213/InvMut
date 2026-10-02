import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX3 reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should detect mutant m2bd22b64 by exploiting removed overflow protection in multiplicate", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX3");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // Step 1: Fund the contract with a very large balance to enable overflow scenario
    const largeAmount = ethers.parseEther("1000");
    await owner.sendTransaction({
      to: instanceAddress,
      value: largeAmount
    });

    // Step 2: Calculate msg.value that would cause overflow when added to contract balance
    // We need: contractBalance + msg.value > type(uint256).max
    const contractBalance = await ethers.provider.getBalance(instanceAddress);
    const maxUint = ethers.MaxUint256;
    const overflowValue = maxUint - contractBalance + 1n;

    // Step 3: Call multiplicate with overflow value - should revert in original but might not in mutant
    // The original require would catch this overflow; the mutant removes the check
    await expect(
      instance.connect(owner).multiplicate(addr1.address, { value: overflowValue })
    ).to.be.reverted;
  });
});