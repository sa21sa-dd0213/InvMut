import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 - Kill mutant m78584fbb", function () {
  it("should kill the mutant by sending 0 wei to multiplicate, which reverts on mutant but passes on original", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send some initial ether to the contract so balance > 0
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });

    // Now call multiplicate with 0 wei - should pass on original, revert on mutant due to underflow
    const tx = instance.connect(addr1).multiplicate(addr1.address, { value: 0 });
    await expect(tx).to.be.reverted;
  });
});