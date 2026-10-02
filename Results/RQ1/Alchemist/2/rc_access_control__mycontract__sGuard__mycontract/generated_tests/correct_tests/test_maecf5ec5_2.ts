import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract mutant detection", function () {
  it("should revert when non-owner calls sendTo (original contract behavior)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Original contract: require(msg.sender == owner) => non-owner call should revert
    // Mutant: require(msg.sender != owner) => non-owner call will succeed, causing this test to fail (killing the mutant)
    await expect(
      instance.connect(addr1).sendTo(addr2.address, ethers.parseEther("1"))
    ).to.be.reverted;
  });
});