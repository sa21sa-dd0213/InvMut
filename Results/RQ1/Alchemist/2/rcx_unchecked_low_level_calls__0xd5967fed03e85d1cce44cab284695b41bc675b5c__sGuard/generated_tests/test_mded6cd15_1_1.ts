import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant detection - sha256 vs keccak256", function () {
  it("should detect mutant using sha256 instead of keccak256 for function selector", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a simple token contract that implements transferFrom
    const TokenFactory = await ethers.getContractFactory("SimpleERC20");
    const token = await TokenFactory.deploy("Test", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();
    
    // Deploy the demo contract (no constructor args needed for this contract)
    const DemoFactory = await ethers.getContractFactory("demo");
    const demo = await DemoFactory.deploy();
    await demo.waitForDeployment();
    
    // Fund addr1 with tokens and approve demo contract to spend them
    await token.transfer(addr1.address, ethers.parseEther("100"));
    await token.connect(addr1).approve(demo.target, ethers.parseEther("100"));
    
    // Get initial balances
    const initialBalanceAddr2 = await token.balanceOf(addr2.address);
    
    // Call the transfer function which should use transferFrom internally
    const recipients = [addr2.address];
    await demo.connect(addr1).transfer(
      addr1.address,
      token.target,
      recipients,
      ethers.parseEther("10")
    );
    
    // Check that the transfer actually occurred
    const finalBalanceAddr2 = await token.balanceOf(addr2.address);
    expect(finalBalanceAddr2).to.equal(initialBalanceAddr2 + ethers.parseEther("10"));
  });
});