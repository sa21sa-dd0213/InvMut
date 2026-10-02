import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant kill test - m4d275e96", function () {
  it("should revert when tos.length < vs.length (original behavior) but mutant passes", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy AirDropContract (constructor has no arguments)
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a simple ERC20 token to use as contract_address
    const TokenFactory = await ethers.getContractFactory("ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();
    
    // Approve the AirDropContract to transfer tokens on behalf of owner
    await token.approve(await instance.getAddress(), ethers.parseEther("1000"));
    
    // Setup: 2 recipients but 3 values (tos.length < vs.length)
    const tos = [addr1.address, addr2.address];
    const vs = [ethers.parseEther("10"), ethers.parseEther("20"), ethers.parseEther("30")];
    
    // This should revert in the original contract (tos.length != vs.length)
    // The mutant would allow it (tos.length <= vs.length), making the test fail
    await expect(
      instance.transfer(await token.getAddress(), tos, vs)
    ).to.be.reverted;
  });
});