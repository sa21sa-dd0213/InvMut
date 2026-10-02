import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems mutant m1bb93ae1 - multiplication vs exponentiation", function () {
  it("should revert or fail when minting multiple items due to incorrect price calculation", async function () {
    const [owner, buyer, treasury] = await ethers.getSigners();

    // Deploy Neuron contract first (needed for NRN payments)
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuron = await NeuronFactory.deploy(
      owner.address,
      treasury.address,
      owner.address
    );
    await neuron.waitForDeployment();

    // Deploy GameItems
    const GameItemsFactory = await ethers.getContractFactory("GameItems");
    const gameItems = await GameItemsFactory.deploy(
      owner.address,
      treasury.address
    );
    await gameItems.waitForDeployment();

    // Setup: instantiate Neuron contract in GameItems
    await gameItems.instantiateNeuronContract(await neuron.getAddress());

    // Make owner admin
    await gameItems.adjustAdminAccess(owner.address, true);

    // Create a game item with price = 10 NRN, not finite supply, transferable
    await gameItems.createGameItem(
      "Test Item",
      "https://test.uri",
      false,  // finiteSupply = false
      true,   // transferable = true
      100,    // itemsRemaining
      ethers.parseEther("10"),  // itemPrice = 10 NRN
      10      // dailyAllowance
    );

    // Fund buyer with enough NRN
    const mintAmount = ethers.parseEther("1000");
    await neuron.mint(buyer.address, mintAmount);

    // Add spender role for GameItems contract
    await neuron.addSpender(gameItems.getAddress());

    // Approve GameItems contract to spend buyer's NRN
    await neuron.connect(buyer).approve(await gameItems.getAddress(), mintAmount);

    // Try to mint 2 items (quantity = 2)
    // Original: price = 10 * 2 = 20 NRN
    // Mutant: price = 10 ** 2 = 100 NRN
    // With 1000 NRN balance, original should succeed, mutant might also succeed
    // but the key is checking the actual NRN balance transfer

    const buyerBalanceBefore = await neuron.balanceOf(buyer.address);
    const treasuryBalanceBefore = await neuron.balanceOf(treasury.address);

    // Execute mint
    await gameItems.connect(buyer).mint(0, 2);

    const buyerBalanceAfter = await neuron.balanceOf(buyer.address);
    const treasuryBalanceAfter = await neuron.balanceOf(treasury.address);

    // Calculate actual NRN transferred
    const actualTransfer = buyerBalanceBefore - buyerBalanceAfter;
    const expectedTransfer = ethers.parseEther("20"); // 10 * 2 for original

    // The mutant would transfer 10^2 = 100 NRN instead of 20 NRN
    // This assertion should fail on the mutant
    expect(actualTransfer).to.equal(expectedTransfer);

    // Also verify treasury received the correct amount
    expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(expectedTransfer);
  });

  it("should revert when buyer has enough for original price but not for exponentiated price", async function () {
    const [owner, buyer, treasury] = await ethers.getSigners();

    // Deploy contracts
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuron = await NeuronFactory.deploy(
      owner.address,
      treasury.address,
      owner.address
    );
    await neuron.waitForDeployment();

    const GameItemsFactory = await ethers.getContractFactory("GameItems");
    const gameItems = await GameItemsFactory.deploy(
      owner.address,
      treasury.address
    );
    await gameItems.waitForDeployment();

    // Setup
    await gameItems.instantiateNeuronContract(await neuron.getAddress());
    await gameItems.adjustAdminAccess(owner.address, true);

    // Create item with price = 5 NRN
    await gameItems.createGameItem(
      "Test Item 2",
      "https://test2.uri",
      false,
      true,
      100,
      ethers.parseEther("5"),
      10
    );

    // Fund buyer with exactly enough for original price but not exponentiated
    // Original: 5 * 3 = 15 NRN
    // Mutant: 5 ** 3 = 125 NRN
    // Give buyer 20 NRN (enough for original, not enough for mutant)
    const buyerFunds = ethers.parseEther("20");
    await neuron.mint(buyer.address, buyerFunds);

    // Add spender role for GameItems contract
    await neuron.addSpender(gameItems.getAddress());
    // Approve
    await neuron.connect(buyer).approve(await gameItems.getAddress(), buyerFunds);

    // This should succeed on original (5*3=15 <= 20) 
    // but revert on mutant (5**3=125 > 20)
    await expect(
      gameItems.connect(buyer).mint(0, 3)
    ).to.be.reverted;
  });
});