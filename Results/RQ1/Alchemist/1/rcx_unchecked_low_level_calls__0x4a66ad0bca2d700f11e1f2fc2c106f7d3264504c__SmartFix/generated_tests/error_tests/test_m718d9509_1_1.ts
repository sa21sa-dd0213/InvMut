import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m718d9509 detection", function () {
  it("should detect keccak256 replaced with sha256 by verifying correct function selector is used in low-level call", async function () {
    // Deploy a simple ERC20 mock token for testing
    const tokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await tokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Get signers
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a test contract that mimics EBU but uses configurable addresses
    const TestEBU = await ethers.getContractFactory("TestEBU");
    const testInstance = await TestEBU.deploy(owner.address, token.target);
    await testInstance.waitForDeployment();

    // Fund the token contract with some tokens to allow transferFrom
    const initialSupply = ethers.parseEther("1000");
    await token.mint(owner.address, initialSupply);
    
    // Approve the test contract to spend tokens
    await token.connect(owner).approve(testInstance.target, ethers.parseEther("100"));

    // Now call transfer with valid parameters
    const tos = [addr1.address];
    const amounts = [ethers.parseEther("1")];

    // This should succeed on original (correct selector) but fail on mutant
    // because mutant uses sha256 which produces wrong function selector
    const tx = await testInstance.connect(owner).transfer(tos, amounts);
    await tx.wait();

    // Check that the transfer actually happened on the token contract
    const balance = await token.balanceOf(addr1.address);
    expect(balance).to.equal(ethers.parseEther("1"));
  });
});