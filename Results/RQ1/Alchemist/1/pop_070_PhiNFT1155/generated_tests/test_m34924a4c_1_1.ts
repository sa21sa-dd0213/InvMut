import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 mutant kill test - createArtFromFactory division vs subtraction", function () {
  it("should kill the mutant by verifying correct excess ETH return when msg.value is not a multiple of artFee", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy PhiNFT1155 with constructor arguments
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a mock PhiFactory to test the createArtFromFactory function
    const MockFactory = await ethers.getContractFactory("MockPhiFactory");
    const mockFactory = await MockFactory.deploy();
    await mockFactory.waitForDeployment();

    // Initialize the PhiNFT1155 contract
    const credChainId = 1;
    const credId = 1;
    const verificationType = "test";
    const protocolFeeDestination = owner.address;

    await instance.initialize(
      credChainId,
      credId,
      verificationType,
      protocolFeeDestination
    );

    // Set the phiFactoryContract address to our mock
    await instance.setPhiFactoryContract(mockFactory.target);

    // Set the protocolFeeDestination to receive art fees
    await instance.setProtocolFeeDestination(owner.address);

    // Configure mock factory to return a specific artFee
    const artFee = ethers.parseEther("1.0"); // 1 ETH fee
    await mockFactory.setArtCreateFee(artFee);

    // Test case: send msg.value = artFee * 2 + 0.5 ETH (not a multiple)
    const msgValue = artFee * 2n + ethers.parseEther("0.5"); // 2.5 ETH
    const expectedExcess = msgValue - artFee; // 1.5 ETH

    // Get the balance of the caller before the transaction
    const balanceBefore = await ethers.provider.getBalance(owner.address);

    // Call createArtFromFactory as the phiFactory (owner acts as factory)
    const artId = 1;
    const tx = await instance.connect(owner).createArtFromFactory(artId, { value: msgValue });
    const receipt = await tx.wait();

    // Get the balance after the transaction
    const balanceAfter = await ethers.provider.getBalance(owner.address);

    // Calculate actual excess returned (balance change minus gas cost)
    const gasCost = receipt.gasUsed * receipt.gasPrice;
    const actualReturned = balanceAfter - balanceBefore + gasCost;

    // The mutant with division would return msg.value / artFee = 2.5 / 1 = 2 (truncated)
    // The original returns msg.value - artFee = 1.5
    // If the test passes (actualReturned equals expectedExcess), the mutant is killed
    expect(actualReturned).to.equal(expectedExcess);

    // Additional verification: the artId should map to tokenId 1
    const tokenId = await instance.getTokenIdFromFactoryArtId(artId);
    expect(tokenId).to.equal(1);
  });

  it("should revert when artFee is zero and division would cause issues", async function () {
    const [owner] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const MockFactory = await ethers.getContractFactory("MockPhiFactory");
    const mockFactory = await MockFactory.deploy();
    await mockFactory.waitForDeployment();

    await instance.initialize(1, 1, "test", owner.address);
    await instance.setPhiFactoryContract(mockFactory.target);
    await instance.setProtocolFeeDestination(owner.address);

    // Set artFee to zero
    await mockFactory.setArtCreateFee(0);

    // Send any value with artFee = 0 - division by zero would revert in mutant
    await expect(
      instance.connect(owner).createArtFromFactory(1, { value: ethers.parseEther("1.0") })
    ).to.be.reverted; // Original would work, mutant would revert
  });
});