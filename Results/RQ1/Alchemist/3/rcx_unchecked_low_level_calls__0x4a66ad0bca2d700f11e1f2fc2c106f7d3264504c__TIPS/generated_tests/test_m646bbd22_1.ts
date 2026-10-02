import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m646bbd22 detection test", function () {
  it("should succeed when transferFrom call succeeds, but mutant always reverts", async function () {
    // Deploy the contract (no constructor arguments needed based on the contract code)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Get signers
    const [owner, addr1, addr2] = await ethers.getSigners();

    // The contract's 'from' address is hardcoded as 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We need to impersonate this address to call transfer (due to require(msg.sender == ...))
    // For testing purposes, we'll use hardhat_impersonateAccount to simulate this address
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: ["0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"]
    });
    const fromSigner = await ethers.getSigner("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9");

    // Fund the fromSigner with some ETH for gas
    await owner.sendTransaction({
      to: "0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9",
      value: ethers.parseEther("1.0")
    });

    // The contract's 'caddress' is hardcoded as 0x1f844685f7Bf86eFcc0e74D8642c54A257111923
    // We need to set up this address to accept the transferFrom call
    // For simplicity, we'll deploy a simple ERC20-like contract that always returns success
    const MockTokenFactory = await ethers.getContractFactory("contracts/MockToken.sol:MockToken");
    const mockToken = await MockTokenFactory.deploy();
    await mockToken.waitForDeployment();
    
    // Set the contract's caddress to our mock token by calling a setter (if exists) or using storage manipulation
    // Since the contract doesn't have a setter, we'll need to use hardhat_setStorageAt
    // The caddress is at storage slot 1 (0x1)
    const storageSlot = ethers.zeroPadValue(ethers.toBeHex(1), 32);
    const mockTokenAddress = await mockToken.getAddress();
    await hre.network.provider.request({
      method: "hardhat_setStorageAt",
      params: [
        contractAddress,
        storageSlot,
        ethers.zeroPadValue(mockTokenAddress, 32)
      ]
    });

    // Mint tokens to the fromSigner and approve the contract to spend them
    const mintAmount = ethers.parseEther("100");
    await mockToken.mint("0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9", mintAmount);
    await mockToken.connect(fromSigner).approve(contractAddress, mintAmount);

    // Now call transfer with valid parameters that should succeed
    const recipients = [await addr1.getAddress()];
    const amounts = [1]; // 1 token * 10^18 = 1 ether worth

    // This should succeed on the original contract (no revert)
    // On the mutant, it will always revert due to if(true)
    await expect(
      instance.connect(fromSigner).transfer(recipients, amounts)
    ).to.not.be.reverted;

    // Clean up: stop impersonating
    await hre.network.provider.request({
      method: "hardhat_stopImpersonatingAccount",
      params: ["0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9"]
    });
  });
});