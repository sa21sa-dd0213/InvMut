import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant detection - m2de83389", function () {
  it("should detect mutant where i < _tos.length changed to i <= _tos.length", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a token contract to call transferFrom on (any contract that will revert)
    const tokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await tokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Fund addr1 with tokens and approve owner
    await token.transfer(addr1.address, ethers.parseEther("100"));
    await token.connect(addr1).approve(owner.address, ethers.parseEther("100"));

    // Test with exactly one recipient - should succeed on original but fail on mutant
    const recipients = [addr2.address];
    const amount = ethers.parseEther("10");

    // On original: loop runs once (i=0), succeeds
    // On mutant: loop runs twice (i=0 and i=1), second iteration causes out-of-bounds access and revert
    await expect(
      instance.transfer(addr1.address, token.target, recipients, amount)
    ).to.be.reverted;
  });
});