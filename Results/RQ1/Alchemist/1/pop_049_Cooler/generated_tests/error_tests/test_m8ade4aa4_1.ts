import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m8ade4aa4 - rescindRequest authorization", function () {
  it("should revert when non-owner calls rescindRequest on active request", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy factory (which deploys cooler implementation)
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();
    
    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20 = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20.deploy("Collateral", "COL", 18);
    await collateral.waitForDeployment();
    const debt = await ERC20.deploy("Debt", "DEBT", 18);
    await debt.waitForDeployment();
    
    // Generate a cooler for the owner
    await factory.connect(owner).generateCooler(await collateral.getAddress(), await debt.getAddress());
    
    // Get the cooler address
    const coolersFor = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress());
    const coolerAddress = coolersFor[0];
    const cooler = await ethers.getContractAt("Cooler", coolerAddress);
    
    // Mint collateral to owner and approve cooler
    const collateralAmount = ethers.parseEther("100");
    await collateral.mint(owner.address, collateralAmount);
    await collateral.connect(owner).approve(coolerAddress, collateralAmount);
    
    // Create a loan request
    const amount = ethers.parseEther("10");
    const interest = ethers.parseEther("0.1");
    const loanToCollateral = ethers.parseEther("2");
    const duration = 86400; // 1 day
    
    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);
    
    // Attempt to rescind request from non-owner (addr1) - should revert
    await expect(
      cooler.connect(addr1).rescindRequest(0)
    ).to.be.revertedWith("OnlyApproved");
  });
});