import { expect } from "chai";
import { ethers } } from "hardhat";

describe("EBU mutant m69886c07 - sha256 instead of keccak256", function () {
  it("should detect mutant by verifying transferFrom is correctly called", async function () {
    const [owner, from, to] = await ethers.getSigners();
    
    // Deploy a simple ERC20 token that the EBU contract will call
    const ERC20Factory = await ethers.getContractFactory("ERC20");
    const token = await ERC20Factory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Deploy EBU contract (no constructor arguments needed based on provided code)
    const EBUFactory = await ethers.getContractFactory("EBU");
    const ebu = await EBUFactory.deploy();
    await ebu.waitForDeployment();
    
    // Setup: mint tokens to 'from' address and approve EBU contract to spend them
    const mintAmount = ethers.parseEther("100");
    await token.mint(from.address, mintAmount);
    
    // Approve EBU contract to transferFrom on behalf of 'from'
    await token.connect(from).approve(await ebu.getAddress(), mintAmount);
    
    // Prepare parameters for transfer call
    const recipients = [to.address];
    const amounts = [ethers.parseEther("10")];
    
    // Call the transfer function
    const tx = await ebu.transfer(from.address, await token.getAddress(), recipients, amounts);
    await tx.wait();
    
    // Verify balances: on original, transferFrom was called so 'to' should have 10 tokens
    // On mutant, sha256 produces wrong selector, so no transfer happens
    const toBalance = await token.balanceOf(to.address);
    expect(toBalance).to.equal(ethers.parseEther("10"));
  });
});