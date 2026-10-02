import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant kill test - m4d275e96", function () {
  it("should revert when tos.length < vs.length (original behavior) but mutant would pass", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like token to use as contract_address
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Approve the AirDropContract to transfer tokens from owner
    await token.approve(await instance.getAddress(), ethers.parseEther("1000"));

    // Setup: 2 addresses but 3 values (tos.length < vs.length)
    const tos = [addr1.address, addr2.address];
    const vs = [ethers.parseEther("10"), ethers.parseEther("20"), ethers.parseEther("30")];

    // The mutant would allow this (tos.length <= vs.length is true)
    // The original would revert (tos.length == vs.length is false)
    await expect(
      instance.transfer(await token.getAddress(), tos, vs)
    ).to.be.reverted;
  });
});