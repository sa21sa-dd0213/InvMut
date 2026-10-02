import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant kill test", function () {
  it("should kill mutant me5ff4b17 by sending non-zero msg.value to multiplicate", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with some ether first
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });

    // Now call multiplicate with a non-zero msg.value
    // Original: require((balance + msg.value) >= balance) passes for any non-zero msg.value
    // Mutant: require((balance + msg.value) == balance) fails for any non-zero msg.value
    await expect(
      instance.connect(addr1).multiplicate(addr1.address, { value: ethers.parseEther("0.5") })
    ).to.be.reverted;
  });
});