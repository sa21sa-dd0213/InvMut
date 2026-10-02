import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant detection - m53c23e7e", function () {
  it("should revert when _tos array is empty (length 0) in original, but mutant allows execution", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like token for testing transferFrom
    const TokenFactory = await ethers.getContractFactory("contracts/ERC20.sol:ERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Approve the airPort contract to spend tokens from owner
    await token.approve(await instance.getAddress(), ethers.parseEther("100"));

    // Call transfer with an empty _tos array - should revert in original but not in mutant
    await expect(
      instance.transfer(
        owner.address,
        await token.getAddress(),
        [],
        ethers.parseEther("10")
      )
    ).to.be.reverted;
  });
});