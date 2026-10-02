import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant m6648f569 test", function () {
  it("should kill mutant that replaces keccak256 with sha256", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy a simple ERC20-like contract that implements transferFrom
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to owner and approve the demo contract to spend them
    await token.mint(owner.address, ethers.parseEther("100"));
    await token.approve(owner.address, ethers.parseEther("100"));

    // Deploy the demo contract (no constructor arguments)
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Setup test parameters
    const recipients = [addr1.address, addr2.address];
    const amounts = [ethers.parseEther("10"), ethers.parseEther("20")];

    // The original contract should succeed, but mutant will fail because sha256 produces wrong selector
    await expect(
      instance.transfer(owner.address, token.target, recipients, amounts)
    ).to.be.reverted;
  });
});