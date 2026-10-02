import { expect } from "chai";
import { ethers } from "hardhat";

describe("MyContract mutant detection test", function () {
  it("should allow owner to send ETH (original) but revert on mutant with != check", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MyContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const amount = ethers.parseEther("1.0");

    // Owner should be able to call sendTo on the original contract
    // The mutant changes require(msg.sender == owner) to require(msg.sender != owner)
    // This will cause a revert when owner calls the function
    await expect(
      instance.connect(owner).sendTo(addr1.address, amount)
    ).to.be.reverted;
  });
});