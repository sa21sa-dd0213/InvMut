import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant kill test - m53c23e7e", function () {
  it("should revert when _tos array is empty (original) but pass on mutant", async function () {
    const [owner, from, recipient] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments)
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like token to use as caddress
    const TokenFactory = await ethers.getContractFactory("contracts/ERC20.sol:ERC20"); // assuming standard ERC20
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint tokens to the from address
    await token.mint(from.address, ethers.parseEther("100"));
    
    // Approve the airPort contract to spend tokens (if needed by transferFrom)
    await token.connect(from).approve(await instance.getAddress(), ethers.parseEther("100"));

    // Test: call transfer with empty _tos array - should revert in original
    await expect(
      instance.connect(owner).transfer(
        from.address,
        await token.getAddress(),
        [],
        ethers.parseEther("10")
      )
    ).to.be.reverted;
  });
});