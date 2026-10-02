import { expect } from "chai";
import { ethers } from "hardhat";

describe("ANCHToken mutant detection - maf85c13f", function () {
  it("should detect mutant by verifying reflection rate calculation after transfers between non-allowed addresses", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy with mock router and USD token addresses (we need valid addresses for constructor)
    const MockRouter = await ethers.getContractFactory("MockUniswapV2Router02");
    const MockFactory = await ethers.getContractFactory("MockUniswapV2Factory");
    const mockFactory = await MockFactory.deploy();
    await mockFactory.waitForDeployment();
    const mockRouter = await MockRouter.deploy(await mockFactory.getAddress());
    await mockRouter.waitForDeployment();

    // Create a mock USD token
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const usdToken = await MockERC20.deploy("USD", "USD", 18);
    await usdToken.waitForDeployment();

    const Factory = await ethers.getContractFactory("ANCHToken");
    const instance = await Factory.deploy(await mockRouter.getAddress(), await usdToken.getAddress());
    await instance.waitForDeployment();

    // Get initial balance of addr1
    const initialBalance = await instance.balanceOf(addr1.address);

    // Transfer tokens from owner to addr1 (owner has all initial supply)
    const transferAmount = ethers.parseEther("100");
    await instance.connect(owner).transfer(addr1.address, transferAmount);

    // Now transfer between two non-allowed addresses (addr1 to addr2)
    const transferAmount2 = ethers.parseEther("50");
    await instance.connect(addr1).transfer(addr2.address, transferAmount2);

    // Check that addr2 received exactly 50 tokens (reflection rate should be 1:1 for normal transfers)
    const addr2Balance = await instance.balanceOf(addr2.address);
    expect(addr2Balance).to.equal(transferAmount2);

    // Also verify addr1 balance decreased correctly
    const addr1Balance = await instance.balanceOf(addr1.address);
    expect(addr1Balance).to.equal(transferAmount.sub(transferAmount2));
  });
});