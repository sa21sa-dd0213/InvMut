import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant ma17c396b test", function () {
  it("should kill mutant by calling transfer with a valid non-empty array", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token to use as the caddress parameter
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Setup: owner approves the demo contract to transfer tokens
    await token.approve(instance.target, ethers.parseEther("1000"));

    // Call transfer with a valid non-empty array of recipients and amounts
    const recipients = [addr1.address];
    const amounts = [ethers.parseEther("10")];
    
    // This should succeed on original but fail on mutant because require(_tos.length < 0) always reverts
    await expect(
      instance.transfer(owner.address, token.target, recipients, amounts)
    ).to.not.be.reverted;
  });
});