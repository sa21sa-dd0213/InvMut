import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant test - m454a07f5", function () {
  it("should kill mutant by calling transfer from authorized address with tokens approved for original from address but not for address(this)", async function () {
    // Get signers
    const [owner, , addr1, addr2] = await ethers.getSigners();

    // The authorized address from the contract (must match the hardcoded address)
    const AUTHORIZED_ADDRESS = "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9";

    // Deploy a mock token contract that will act as caddress
    // We need a simple ERC20-like contract that has transferFrom
    const MockToken = await ethers.getContractFactory("MockToken");
    const mockToken = await MockToken.deploy();
    await mockToken.waitForDeployment();

    // Deploy EBU contract
    const EBU = await ethers.getContractFactory("EBU");
    const ebu = await EBU.deploy();
    await ebu.waitForDeployment();

    // The contract's own address (address(this) in the mutant)
    const contractAddress = await ebu.getAddress();

    // Get the caddress from the deployed EBU
    const caddress = await ebu.caddress();

    // Impersonate the authorized address to send transactions
    // First, we need to fund the authorized address with ETH
    await owner.sendTransaction({
      to: AUTHORIZED_ADDRESS,
      value: ethers.parseEther("1.0")
    });

    // Get signer for authorized address using impersonation
    await ethers.provider.send("hardhat_impersonateAccount", [AUTHORIZED_ADDRESS]);
    const authorizedSigner = await ethers.getSigner(AUTHORIZED_ADDRESS);

    // Mint tokens to the authorized address (the original from address)
    const mintAmount = ethers.parseEther("100");
    await mockToken.mint(AUTHORIZED_ADDRESS, mintAmount);

    // Approve the EBU contract to spend tokens FROM the authorized address
    // This is the original behavior - approve for the fixed address
    await mockToken.connect(authorizedSigner).approve(contractAddress, mintAmount);

    // Now set up the test parameters
    const tos = [addr1.address, addr2.address];
    const values = [1, 2]; // in whole tokens, will be multiplied by 1e18 inside contract

    // In the ORIGINAL contract, this call would succeed because:
    // - msg.sender is authorized
    // - tokens are transferred from the authorized address (which has approved)
    // 
    // In the MUTANT, this call should FAIL because:
    // - The contract tries to transferFrom(address(this), ...) 
    // - The contract address has not approved itself (or the token contract)
    // - So the transferFrom call will revert
    // 
    // The test expects the call to succeed (original behavior)
    // But the mutant will revert, causing the test to fail => killing the mutant
    await expect(
      ebu.connect(authorizedSigner).transfer(tos, values)
    ).to.not.be.reverted;
  });
});