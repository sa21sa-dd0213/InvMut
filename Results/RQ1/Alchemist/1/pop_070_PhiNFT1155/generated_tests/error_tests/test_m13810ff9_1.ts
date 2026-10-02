import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 - kill mutant m13810ff9 (createArtFromFactory refund)", function () {
  let instance: any;
  let owner: any;
  let addr1: any;
  let phiFactoryMock: any;
  let protocolFeeDestination: any;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy PhiNFT1155 (constructor takes no arguments based on the code)
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a mock PhiFactory to interact with
    const PhiFactoryMock = await ethers.getContractFactory("PhiFactoryMock");
    phiFactoryMock = await PhiFactoryMock.deploy();
    await phiFactoryMock.waitForDeployment();

    // Set protocol fee destination to a test address
    protocolFeeDestination = ethers.Wallet.createRandom().address;
    
    // Initialize the contract
    await instance.initialize(
      1, // credChainId
      1, // credId
      "test", // verificationType
      protocolFeeDestination // protocolFeeDestination
    );

    // Set the phiFactoryContract address in the mock to return proper values
    await instance.setPhiFactoryAddress(await phiFactoryMock.getAddress());
  });

  it("should refund excess ETH when msg.value > artFee in createArtFromFactory", async function () {
    const artId = 1;
    const artFee = ethers.parseEther("1");
    
    // Configure mock to return the art fee
    await phiFactoryMock.setArtCreateFee(artFee);
    
    // Get balance before
    const balanceBefore = await ethers.provider.getBalance(owner.address);
    
    // Send more than art fee
    const excess = ethers.parseEther("0.5");
    const tx = await instance.connect(owner).createArtFromFactory(artId, { value: artFee + excess });
    await tx.wait();
    
    // Get balance after
    const balanceAfter = await ethers.provider.getBalance(owner.address);
    
    // The caller should only lose the artFee, not the excess
    // Original contract: balanceAfter = balanceBefore - artFee - gas
    // Mutant (false): balanceAfter = balanceBefore - (artFee + excess) - gas
    // So if we check that balanceAfter > balanceBefore - (artFee + excess), the mutant fails
    const minExpectedBalance = balanceBefore - (artFee + excess) - ethers.parseEther("0.01"); // account for gas
    expect(balanceAfter).to.be.gt(minExpectedBalance);
    
    // Additionally, check that the protocol fee destination received the correct amount
    const protocolBalance = await ethers.provider.getBalance(protocolFeeDestination);
    expect(protocolBalance).to.equal(artFee);
  });
});