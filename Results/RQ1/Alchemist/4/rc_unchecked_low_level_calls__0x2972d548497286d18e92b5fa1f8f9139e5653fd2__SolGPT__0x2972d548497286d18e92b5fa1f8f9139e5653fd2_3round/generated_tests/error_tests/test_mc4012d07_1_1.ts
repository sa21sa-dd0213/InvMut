import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant mc4012d07 - kill with empty _tos array", function () {
  it("should revert when _tos array is empty in original but pass in mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple token contract to use as the caddress parameter
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Fund addr1 with some tokens and approve owner to transferFrom
    await token.mint(addr1.address, ethers.parseEther("100"));
    await token.connect(addr1).approve(owner.address, ethers.parseEther("100"));

    // Call transfer with empty arrays - should revert in original due to require(_tos.length > 0)
    // but mutant with require(_tos.length >= 0) will always pass
    await expect(
      instance.transfer(
        addr1.address,
        await token.getAddress(),
        [],
        []
      )
    ).to.be.reverted;
  });
});