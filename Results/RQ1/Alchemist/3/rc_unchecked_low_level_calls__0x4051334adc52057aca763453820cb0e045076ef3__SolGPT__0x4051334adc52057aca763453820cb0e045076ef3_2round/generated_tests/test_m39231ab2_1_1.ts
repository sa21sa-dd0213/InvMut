import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when _tos array is empty (kills mutant that changed > to >=)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airdrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token to use as the caddress parameter
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Mock", "MCK", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Fund addr1 with some tokens and approve the airdrop contract
    await token.transfer(addr1.address, ethers.parseEther("100"));
    await token.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("100"));

    // Attempt to call transfer with empty _tos array - should revert in original but pass in mutant
    await expect(
      instance.transfer(
        addr1.address,
        await token.getAddress(),
        [],
        ethers.parseEther("10")
      )
    ).to.be.reverted;
  });
});