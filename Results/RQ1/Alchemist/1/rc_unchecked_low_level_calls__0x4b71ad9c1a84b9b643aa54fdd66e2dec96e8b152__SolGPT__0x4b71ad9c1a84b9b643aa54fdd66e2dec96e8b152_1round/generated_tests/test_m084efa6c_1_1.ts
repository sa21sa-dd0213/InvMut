import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant test - m084efa6c", function () {
  it("should revert when external call fails in original but not in mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the airPort contract (no constructor arguments needed based on provided code)
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a simple ERC20-like contract that will reject transferFrom calls
    const RejectingTokenFactory = await ethers.getContractFactory("contracts/RejectingToken.sol:RejectingToken");
    const rejectingToken = await RejectingTokenFactory.deploy();
    await rejectingToken.waitForDeployment();
    
    // Setup: owner has some tokens and approves the airPort contract
    const tokenAddress = await rejectingToken.getAddress();
    const approveTx = await rejectingToken.approve(await instance.getAddress(), ethers.parseEther("100"));
    await approveTx.wait();
    
    // Call transfer with from=owner, caddress=rejectingToken, tos=[addr1], v=10
    // This should fail because the token's transferFrom will revert
    const tx = instance.transfer(
      owner.address,
      tokenAddress,
      [addr1.address],
      ethers.parseEther("10")
    );
    
    // The original requires the call to succeed, so this should revert
    await expect(tx).to.be.reverted;
  });
});