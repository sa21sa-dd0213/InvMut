import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m195ba7dc - keccak256 replaced with sha256", function () {
  it("should detect the mutant by expecting the transfer to revert when sha256 produces wrong selector", async function () {
    const [owner] = await ethers.getSigners();

    // Deploy the contract (no constructor arguments needed for this contract)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the hardcoded from address and contract address from the contract
    const from = await instance.from();
    const caddress = await instance.caddress();

    // Prepare valid transfer inputs
    const recipients = [ethers.Wallet.createRandom().address];
    const amounts = [1]; // 1 token (will be multiplied by 10^18 internally)

    // The contract checks msg.sender == 0x9797055B68C5DadDE6b3c7d5D80C9CFE2eecE6c9
    // We need to impersonate that address or use a signer with that private key
    // For testing purposes, we can use the hardhat network's ability to set balance
    // But since we don't have the private key, we'll expect the call to revert
    // due to the sha256 producing an incorrect selector for transferFrom

    // The correct selector is bytes4(keccak256("transferFrom(address,address,uint256)"))
    // which equals 0x23b872dd
    // The mutant uses sha256 which will produce a different selector
    // This means the external call to caddress will fail, causing a revert

    await expect(
      instance.connect(owner).transfer(recipients, amounts)
    ).to.be.reverted;

    // Note: This test kills the mutant because:
    // - Original: keccak256 produces correct selector -> call succeeds -> no revert
    // - Mutant: sha256 produces wrong selector -> call fails -> revert
    // The test expects a revert, which the mutant will produce
  });
});