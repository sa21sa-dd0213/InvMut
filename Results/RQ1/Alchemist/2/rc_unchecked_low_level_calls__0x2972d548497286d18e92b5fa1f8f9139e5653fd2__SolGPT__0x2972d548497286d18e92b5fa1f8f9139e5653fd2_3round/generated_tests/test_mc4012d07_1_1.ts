import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant mc4012d07 test", function () {
  it("should revert when _tos array is empty (original behavior), but mutant allows it", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like token for testing transferFrom
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Owner approves demo contract to transfer tokens
    await token.approve(await instance.getAddress(), ethers.parseEther("100"));
    
    // Fund owner with tokens
    await token.mint(owner.address, ethers.parseEther("100"));

    // Test with empty _tos array - should revert in original, but mutant allows it
    await expect(
      instance.transfer(
        owner.address,
        await token.getAddress(),
        [],
        []
      )
    ).to.be.reverted;
  });
});