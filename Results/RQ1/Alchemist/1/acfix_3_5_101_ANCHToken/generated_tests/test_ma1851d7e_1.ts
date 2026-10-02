import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant kill test - decreaseAllowance return value", function () {
  it("should kill mutant by expecting boolean return value from decreaseAllowance", async function () {
    const [owner, spender] = await ethers.getSigners();
    
    // Deploy with mock router and USDC address (0x0000000000000000000000000000000000000001 as placeholder)
    const RouterFactory = await ethers.getContractFactory("IUniswapV2Router02");
    const mockRouter = await RouterFactory.deploy();
    
    const ANCHTokenFactory = await ethers.getContractFactory("ANCHToken");
    const instance = await ANCHTokenFactory.deploy(
      mockRouter.target,
      "0x0000000000000000000000000000000000000001"
    );
    await instance.waitForDeployment();

    // First approve some tokens to spender
    await instance.approve(spender.address, ethers.parseEther("100"));
    
    // Call decreaseAllowance and capture the return value
    const tx = await instance.connect(owner).decreaseAllowance(spender.address, ethers.parseEther("50"));
    const receipt = await tx.wait();
    
    // Check that the function returned a value (mutant removes return, causing revert or undefined behavior)
    expect(receipt).to.not.be.undefined;
    
    // Verify the allowance was actually decreased
    const allowance = await instance.allowance(owner.address, spender.address);
    expect(allowance).to.equal(ethers.parseEther("50"));
  });
});