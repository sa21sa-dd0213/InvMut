import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant detection test", function () {
  it("should detect mutant m2b27b216 by verifying a successful call does not revert", async function () {
    // Get signers
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy a mock token contract that implements transferFrom
    // We need a simple ERC20-like contract for testing
    const TokenFactory = await ethers.getContractFactory("contracts/ERC20Mock.sol:ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();

    // Deploy the airDrop contract (no constructor args needed)
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Setup: Mint tokens to owner and approve airDrop contract to spend
    const mintAmount = ethers.parseEther("100");
    await token.mint(owner.address, mintAmount);
    await token.connect(owner).approve(contractAddress, mintAmount);

    // Prepare transfer parameters
    const recipients = [addr1.address, addr2.address];
    const value = ethers.parseEther("1");
    const decimals = 18;

    // Execute transfer - should succeed on original, fail on mutant
    const tx = instance.connect(owner).transfer(
      owner.address,
      tokenAddress,
      recipients,
      value,
      decimals
    );

    // The mutant will always revert, so we expect no revert on original
    await expect(tx).to.not.be.reverted;

    // Additional verification: check balances to ensure transfer happened
    const addr1Balance = await token.balanceOf(addr1.address);
    const addr2Balance = await token.balanceOf(addr2.address);
    expect(addr1Balance).to.equal(ethers.parseEther("1"));
    expect(addr2Balance).to.equal(ethers.parseEther("1"));
  });
});