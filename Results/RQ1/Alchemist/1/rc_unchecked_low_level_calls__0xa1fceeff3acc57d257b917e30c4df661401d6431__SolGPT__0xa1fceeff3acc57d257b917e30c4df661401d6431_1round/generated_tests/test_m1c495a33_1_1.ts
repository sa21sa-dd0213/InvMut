import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant detection test", function () {
  it("should revert when contract_address is not the contract itself (mutant requires ==)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like contract to use as a valid external address
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();

    const tokenAddress = await token.getAddress();
    const instanceAddress = await instance.getAddress();

    // Transfer some tokens to owner to allow transferFrom
    await token.transfer(owner.address, ethers.parseEther("100"));
    
    // Approve the AirDropContract to spend tokens
    await token.approve(instanceAddress, ethers.parseEther("100"));

    const tos = [addr1.address];
    const vs = [ethers.parseEther("10")];

    // The mutant requires contract_address == address(this), so passing tokenAddress (which is not the contract) should revert
    await expect(
      instance.transfer(tokenAddress, tos, vs)
    ).to.be.reverted;
  });
});