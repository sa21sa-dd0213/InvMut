import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert on mutant when msg.value is 0 due to underflow, but pass on original", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send some initial ether to the contract so balance > 0
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });

    // Call multiplicate with msg.value = 0
    // Original: require((balance + 0) >= balance) -> passes
    // Mutant: require((balance + 0 - 1) >= balance) -> underflow revert
    await expect(
      instance.connect(owner).multiplicate(addr1.address, { value: 0 })
    ).to.be.reverted;
  });
});