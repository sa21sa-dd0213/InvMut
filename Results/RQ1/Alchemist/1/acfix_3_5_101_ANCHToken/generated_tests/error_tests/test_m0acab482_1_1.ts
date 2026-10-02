import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant test - m0acab482", function () {
  it("should emit Transfer event when transferring between non-whitelisted addresses", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy with mock router and USD token addresses (we don't need them functional for this test)
    const MockRouter = await ethers.getContractFactory("MockUniswapV2Router02");
    const mockRouter = await MockRouter.deploy();
    await mockRouter.waitForDeployment();
    
    const MockUSDToken = await ethers.getContractFactory("MockERC20");
    const mockUSDToken = await MockUSDToken.deploy();
    await mockUSDToken.waitForDeployment();
    
    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(await mockRouter.getAddress(), await mockUSDToken.getAddress());
    await instance.waitForDeployment();
    
    // Transfer some tokens to addr1 first
    const transferAmount = ethers.parseEther("100");
    await instance.transfer(addr1.address, transferAmount);
    
    // Now test transfer from addr1 to addr2 and expect Transfer event
    const tx = await instance.connect(addr1).transfer(addr2.address, ethers.parseEther("10"));
    const receipt = await tx.wait();
    
    // Verify the Transfer event was emitted
    await expect(tx).to.emit(instance, "Transfer").withArgs(addr1.address, addr2.address, ethers.parseEther("10"));
  });
});