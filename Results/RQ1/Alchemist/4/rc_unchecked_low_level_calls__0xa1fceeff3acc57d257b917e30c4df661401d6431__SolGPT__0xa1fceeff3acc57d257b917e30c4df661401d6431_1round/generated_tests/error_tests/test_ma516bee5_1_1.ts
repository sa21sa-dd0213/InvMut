import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant kill test - ma516bee5", function () {
  it("should revert when tos.length > vs.length (original requires exact equality)", async function () {
    const [owner, addr1, addr2, addr3] = await ethers.getSigners();

    // Deploy AirDropContract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20 token that the contract can call transferFrom on
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    // Give owner some tokens and approve the AirDropContract to spend them
    await token.approve(await instance.getAddress(), ethers.parseEther("100"));

    // Setup: 3 addresses in tos array but only 2 values in vs array
    const tos = [addr1.address, addr2.address, addr3.address];
    const vs = [ethers.parseEther("10"), ethers.parseEther("20")]; // Only 2 values

    // This should revert on original (require equality) but might pass on mutant (require >=)
    // Since the mutant allows tos.length >= vs.length, it would try to access vs[2] which is undefined
    // This should cause a revert in the mutant as well due to array bounds access
    await expect(
      instance.connect(owner).transfer(await token.getAddress(), tos, vs)
    ).to.be.reverted;
  });
});