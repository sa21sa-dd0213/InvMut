import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant m55dc9eaa test", function () {
  it("should return true when increaseAllowance is called successfully", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy with constructor arguments (router address and USD token address)
    // Using dummy addresses for the Uniswap router and USD token
    const routerAddress = "0x0000000000000000000000000000000000000001";
    const usdTokenAddress = "0x0000000000000000000000000000000000000002";
    
    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(routerAddress, usdTokenAddress);
    await instance.waitForDeployment();
    
    // Approve addr1 to spend tokens from owner first
    const approveAmount = ethers.parseEther("100");
    await instance.approve(addr1.address, approveAmount);
    
    // Call increaseAllowance and expect it to return true
    const increaseAmount = ethers.parseEther("50");
    const tx = await instance.connect(addr1).increaseAllowance(owner.address, increaseAmount);
    const receipt = await tx.wait();
    
    // The mutant removes the return statement, so we check if the function returned true
    // In ethers v6, we can check the return value by using staticCall or checking the result
    const result = await instance.connect(addr1).increaseAllowance.staticCall(owner.address, increaseAmount);
    expect(result).to.equal(true);
  });
});