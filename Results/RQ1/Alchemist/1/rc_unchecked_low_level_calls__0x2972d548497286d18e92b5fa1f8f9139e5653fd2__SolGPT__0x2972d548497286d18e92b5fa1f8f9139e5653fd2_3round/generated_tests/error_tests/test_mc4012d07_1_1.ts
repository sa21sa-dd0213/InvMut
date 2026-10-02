import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant mc4012d07 test", function () {
  it("should kill mutant by passing empty _tos array to trigger revert on original but not on mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like contract to use as caddress
    const ERC20Factory = await ethers.getContractFactory("ERC20Mock");
    const erc20 = await ERC20Factory.deploy("Test", "TST", 18);
    await erc20.waitForDeployment();

    // Fund addr1 with tokens and approve demo contract
    await erc20.mint(addr1.address, ethers.parseEther("100"));
    await erc20.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("100"));

    // Test with empty arrays - should revert on original (require > 0) but pass on mutant (require >= 0)
    await expect(
      instance.connect(addr1).transfer(
        addr1.address,
        await erc20.getAddress(),
        [],
        []
      )
    ).to.be.reverted;
  });
});