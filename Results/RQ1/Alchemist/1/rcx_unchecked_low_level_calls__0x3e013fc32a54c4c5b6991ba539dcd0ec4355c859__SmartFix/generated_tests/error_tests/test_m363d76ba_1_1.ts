import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant detection", function () {
  it("should revert on mutant when sending non-zero ether to multiplicate with contract balance > 0", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether first
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Now call multiplicate with a non-zero value
    // Original: require((balance + msg.value) >= balance) always passes for positive msg.value
    // Mutant: require((balance - msg.value) >= balance) fails when msg.value > 0
    await expect(
      instance.connect(addr1).multiplicate(addr1.address, { value: ethers.parseEther("0.1") })
    ).to.be.reverted;
  });
});