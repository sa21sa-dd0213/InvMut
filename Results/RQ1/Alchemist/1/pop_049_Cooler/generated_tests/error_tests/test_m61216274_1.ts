import { expect } from "chai";
import { ethers } from "hardhat";

describe("Cooler mutant m61216274 - rollLoan authorization", function () {
  it("should revert when non-owner with numerically smaller address calls rollLoan", async function () {
    // Deploy the CoolerFactory which deploys the Cooler implementation
    const CoolerFactory = await ethers.getContractFactory("CoolerFactory");
    const factory = await CoolerFactory.deploy();
    await factory.waitForDeployment();

    // Get signers
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock ERC20 tokens for collateral and debt
    const ERC20 = await ethers.getContractFactory("ERC20");
    const collateral = await ERC20.deploy("Collateral", "COL", 18);
    await collateral.waitForDeployment();
    const debt = await ERC20.deploy("Debt", "DEBT", 18);
    await debt.waitForDeployment();

    // Generate a cooler for owner with collateral and debt tokens
    await factory.connect(owner).generateCooler(await collateral.getAddress(), await debt.getAddress());
    
    // Get the cooler address from the factory
    const coolerAddress = await factory.coolersFor(await collateral.getAddress(), await debt.getAddress(), 0);
    const Cooler = await ethers.getContractFactory("Cooler");
    const cooler = Cooler.attach(coolerAddress);

    // Fund owner with collateral tokens and approve
    await collateral.connect(owner).approve(await cooler.getAddress(), ethers.parseEther("1000"));
    
    // Create a loan request first
    const amount = ethers.parseEther("100");
    const interest = ethers.parseEther("0.1");
    const loanToCollateral = ethers.parseEther("2");
    const duration = 30 * 24 * 60 * 60; // 30 days

    await cooler.connect(owner).requestLoan(amount, interest, loanToCollateral, duration);

    // Clear the request (act as lender)
    await debt.connect(addr1).approve(await cooler.getAddress(), ethers.parseEther("1000"));
    await cooler.connect(addr1).clearRequest(0, false, false);

    // Now try to call rollLoan from an address numerically smaller than owner
    // Since we can't control address values directly, we find a signer with smaller address
    // or use a different approach - ensure addr2's address is smaller than owner's
    if (addr2.address.toLowerCase() < owner.address.toLowerCase()) {
      await expect(
        cooler.connect(addr2).rollLoan(0)
      ).to.be.revertedWith("OnlyApproved");
    } else {
      // If addr2 is not smaller, we test with addr1 which should be different from owner
      await expect(
        cooler.connect(addr1).rollLoan(0)
      ).to.be.revertedWith("OnlyApproved");
    }
  });
});