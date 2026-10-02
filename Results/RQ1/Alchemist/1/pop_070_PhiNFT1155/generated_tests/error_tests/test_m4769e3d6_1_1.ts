import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant m4769e3d6 test", function () {
  it("should detect mutant by verifying correct refund amount in createArtFromFactory", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy PhiNFT1155 with constructor
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // Initialize the contract
    const credChainId = 1;
    const credId = 1;
    const verificationType = "test";
    const protocolFeeDest = owner.address;

    await instance.initialize(credChainId, credId, verificationType, protocolFeeDest);

    // Get the phiFactoryContract address (it's set during initialize to msg.sender)
    const phiFactoryAddress = await instance.phiFactoryContract();

    // Set up artCreateFee in the factory (we need to mock this)
    // Since we can't easily mock, we'll test the refund logic directly

    // Get current balance of owner before call
    const balanceBefore = await ethers.provider.getBalance(owner.address);

    // Call createArtFromFactory with msg.value = artFee + 1
    // artFee from factory - we'll use a small value for testing
    const artFee = ethers.parseEther("1");
    const msgValue = artFee + BigInt(1);

    // We need to call through the factory interface
    // The factory is set as the owner during initialize (msg.sender)
    // So we can call from owner

    // Get the factory's artCreateFee to know what to expect
    // Since we can't call the actual factory, we'll simulate the test

    // For a proper test, we need to understand that:
    // - Original: refund = msg.value - artFee = 1 wei
    // - Mutant: refund = msg.value - 1 - artFee = 0 wei

    // To test this, we can check the balance change of the caller
    // after the function executes

    // Call createArtFromFactory with the owner (who is the factory)
    // This should revert or behave differently based on the refund amount

    // We expect the owner to receive back 1 wei in the original
    // In the mutant, they receive 0 wei

    // Let's simulate by calling the function
    await expect(
      instance.connect(owner).createArtFromFactory(1, { value: msgValue })
    ).to.not.be.reverted;

    // Check balance after
    const balanceAfter = await ethers.provider.getBalance(owner.address);

    // The balance difference should be: msgValue - artFee - gas costs
    // For the original, the net ETH sent should be artFee (the rest is refunded)
    // For the mutant, the net ETH sent should be artFee + 1 (since 1 wei is not refunded)

    // We can't easily check exact balances due to gas, but we can check that
    // the contract's balance is correct

    const contractBalance = await ethers.provider.getBalance(instanceAddress);

    // In original: contractBalance should be artFee (protocol fee sent)
    // In mutant: contractBalance should be artFee + 1 (extra wei not refunded)

    // The mutant will have 1 wei more in the contract than expected
    expect(contractBalance).to.equal(artFee); // This will fail on mutant since it has artFee + 1
  });
});