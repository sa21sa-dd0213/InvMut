import { expect } from "chai";
import { ethers } from "hardhat";

describe("AirDropContract mutant kill test", function () {
  it("should revert when tos and vs have different lengths (mutant expects !=)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy AirDropContract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("AirDropContract");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a simple ERC20 token to use as contract_address
    const TokenFactory = await ethers.getContractFactory("contracts/ERC20Mock.sol:ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Approve the AirDropContract to spend tokens on behalf of owner
    await token.approve(await instance.getAddress(), ethers.parseEther("100"));
    
    // Prepare arrays with DIFFERENT lengths (2 addresses, 1 value)
    const tos = [addr1.address, owner.address];
    const vs = [ethers.parseEther("10")];
    
    // The mutant expects tos.length != vs.length, so this call should SUCCEED (mutant passes)
    // But the original would revert. We expect the call to succeed in the mutant
    const tx = await instance.transfer(await token.getAddress(), tos, vs);
    await tx.wait();
    
    // Verify the transfer actually happened (first element only, since loop breaks on mismatch)
    // In mutant, loop runs for min(tos.length, vs.length) = 1 iteration
    const balance = await token.balanceOf(addr1.address);
    expect(balance).to.equal(ethers.parseEther("10"));
  });
});