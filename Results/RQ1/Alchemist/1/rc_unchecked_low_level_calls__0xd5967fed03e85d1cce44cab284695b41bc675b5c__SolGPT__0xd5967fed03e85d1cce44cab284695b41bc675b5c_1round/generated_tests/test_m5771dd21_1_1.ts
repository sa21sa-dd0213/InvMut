import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant detection - keccak256 replaced with sha256", function () {
  it("should revert when calling transfer with a valid ERC20 token that implements transferFrom", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy a simple ERC20 token that has transferFrom function
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    const token = await ERC20Factory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Deploy the demo contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("demo");
    const demo = await Factory.deploy();
    await demo.waitForDeployment();

    // Fund addr1 with tokens and approve demo to spend them
    await token.transfer(addr1.address, ethers.parseEther("100"));
    await token.connect(addr1).approve(demo.target, ethers.parseEther("100"));

    // Call transfer on demo - this should revert on the mutant because sha256 produces wrong selector
    const recipients = [addr2.address];
    await expect(
      demo.connect(owner).transfer(
        addr1.address,
        token.target,
        recipients,
        ethers.parseEther("10")
      )
    ).to.be.reverted;
  });
});