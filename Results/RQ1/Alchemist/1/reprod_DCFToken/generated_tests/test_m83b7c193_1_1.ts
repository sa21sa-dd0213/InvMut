import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant m83b7c193 - distributeToken without onlyCaller modifier", function () {
  it("should revert when non-cfo calls distributeToken on original, but pass on mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const liquidityReceiveAddress = addr2.address;

    const Factory = await ethers.getContractFactory("DCF");
    const instance = await Factory.deploy(liquidityReceiveAddress);
    await instance.waitForDeployment();

    // Set the distribute address first (required by distributeToken)
    await instance.setCaller(owner.address);
    await instance.setDistributeAddress(addr2.address);

    // Transfer some tokens to the contract for distribution
    const initialSupply = ethers.parseEther("2000000");
    await instance.transfer(await instance.getAddress(), ethers.parseEther("5000"));

    // Try to call distributeToken from an unauthorized address (addr1)
    // The original contract should revert because addr1 is not the cfo
    // The mutant (without onlyCaller) would allow this call to succeed
    await expect(
      instance.connect(addr1).distributeToken()
    ).to.be.revertedWith("onlyCaller");
  });
});