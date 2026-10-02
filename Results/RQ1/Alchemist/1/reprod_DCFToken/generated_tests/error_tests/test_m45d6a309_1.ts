import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant m45d6a309 - withdrawHelperToken access control", function () {
  let dcf: any;
  let liquidityHelper: any;
  let owner: any;
  let addr1: any;
  let addr2: any;
  let liquidityReceiveAddress: string;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy DCF with required constructor argument (liquidity receive address)
    liquidityReceiveAddress = addr2.address;
    const DCF = await ethers.getContractFactory("DCF");
    dcf = await DCF.deploy(liquidityReceiveAddress);
    await dcf.waitForDeployment();

    // Get the helper contract address
    const helperAddress = await dcf.helperAddress();
    liquidityHelper = await ethers.getContractAt("LiquidityHelper", helperAddress);
  });

  it("should revert when calling withdrawHelperToken from unauthorized address (not cfo)", async function () {
    // Ensure addr1 is not the cfo (cfo is not set initially, so only owner can set it)
    // By default, cfo is address(0), so onlyCaller modifier will always revert for any caller
    
    // Get a token address to withdraw (use the DCF token itself for testing)
    const tokenAddress = await dcf.getAddress();
    
    // Attempt to call withdrawHelperToken from addr1 (unauthorized)
    await expect(
      dcf.connect(addr1).withdrawHelperToken(tokenAddress, addr1.address)
    ).to.be.revertedWith("onlyCaller");
  });

  it("should allow cfo to call withdrawHelperToken after setting caller", async function () {
    // Set addr1 as the cfo (caller)
    await dcf.connect(owner).setCaller(addr1.address);
    
    // Get token address
    const tokenAddress = await dcf.getAddress();
    
    // This should succeed when called from addr1 (now the cfo)
    // The contract has no tokens to withdraw initially, but it won't revert on access control
    // It might revert due to balance check in withdrawToken, but not due to onlyCaller
    const tx = dcf.connect(addr1).withdrawHelperToken(tokenAddress, addr1.address);
    // We expect it to revert with a different reason (balance check) or succeed
    // The important thing is it does NOT revert with "onlyCaller"
    await expect(tx).to.not.be.revertedWith("onlyCaller");
  });
});