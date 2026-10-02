import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant m21d4bc31 test", function () {
  it("should revert when external transferFrom call fails (mutant removes require)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a simple ERC20-like token that will reject transferFrom calls
    const tokenFactory = await ethers.getContractFactory("contracts/TestToken.sol:TestToken");
    const token = await tokenFactory.deploy();
    await token.waitForDeployment();
    
    // Deploy the demo contract
    const demoFactory = await ethers.getContractFactory("demo");
    const demo = await demoFactory.deploy();
    await demo.waitForDeployment();
    
    // Setup: mint tokens to addr1, approve demo contract to spend from addr1
    await token.mint(addr1.address, ethers.parseEther("100"));
    await token.connect(addr1).approve(await demo.getAddress(), ethers.parseEther("10"));
    
    // Prepare transfer parameters: attempt to transfer more than approved (should fail)
    const tos = [addr2.address];
    const values = [ethers.parseEther("100")]; // Exceeds approved amount
    
    // Call transfer from owner - the external call should fail
    // Original: require(_s) would revert
    // Mutant: missing require, so it would not revert but return true
    await expect(
      demo.transfer(addr1.address, await token.getAddress(), tos, values)
    ).to.be.reverted;
  });
});