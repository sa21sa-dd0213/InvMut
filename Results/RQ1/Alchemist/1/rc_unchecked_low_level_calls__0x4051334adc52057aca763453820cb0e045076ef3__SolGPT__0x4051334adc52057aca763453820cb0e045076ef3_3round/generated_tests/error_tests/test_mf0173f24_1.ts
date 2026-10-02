import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop mutant mf0173f24 test", function () {
  it("should revert when calling transfer with empty _tos array on original, but pass on mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airdrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Use a valid token address (any contract that has transferFrom, e.g., a simple ERC20)
    // For testing purposes, we'll deploy a minimal ERC20 mock or use the zero address
    // Since the contract doesn't check if caddress is a token, we can use any address
    const tokenAddress = "0x0000000000000000000000000000000000000001";
    
    // Call transfer with empty _tos array
    await expect(
      instance.transfer(owner.address, tokenAddress, [], ethers.parseEther("1"))
    ).to.be.reverted;
  });
});