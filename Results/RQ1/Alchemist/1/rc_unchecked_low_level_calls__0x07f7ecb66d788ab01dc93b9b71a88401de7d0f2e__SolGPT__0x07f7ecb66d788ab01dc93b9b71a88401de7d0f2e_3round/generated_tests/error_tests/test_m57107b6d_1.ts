import { expect } from "chai";
import { ethers } from "hardhat";

describe("PoCGame mutant m57107b6d", function () {
  it("should revert when non-owner calls transferAnyERC20Token", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const whaleAddress = addr2.address;
    const wagerLimit = ethers.parseEther("1");
    
    const Factory = await ethers.getContractFactory("PoCGame");
    const instance = await Factory.deploy(whaleAddress, wagerLimit);
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token for testing (using a minimal contract)
    const ERC20Factory = await ethers.getContractFactory("ERC20Interface");
    // We need a concrete ERC20 token - deploy a simple one
    const SimpleToken = await ethers.getContractFactory("SimpleERC20");
    const token = await SimpleToken.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Transfer some tokens to the PoCGame contract
    await token.transfer(instance.target, ethers.parseEther("100"));

    // Non-owner attempts to call transferAnyERC20Token - should revert
    await expect(
      instance.connect(addr1).transferAnyERC20Token(
        token.target,
        addr1.address,
        ethers.parseEther("10")
      )
    ).to.be.reverted;
  });
});

// Minimal ERC20 token for testing
contract("SimpleERC20", function () {
  // We'll define it inline in the test file
});

// We need to define SimpleERC20 as a contract for deployment
// This would be in a separate file or inline