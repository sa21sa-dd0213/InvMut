import { expect } from "chai";
import { ethers } from "hardhat";

describe("GameItems - kill mutant m5a440242 (burn authorization check removed)", function () {
  it("should revert when unauthorized address tries to burn tokens", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const treasuryAddress = addr1.address;

    // Deploy GameItems with constructor arguments: owner address and treasury address
    const Factory = await ethers.getContractFactory("GameItems");
    const instance = await Factory.deploy(owner.address, treasuryAddress);
    await instance.waitForDeployment();

    // First create a game item so we have tokens to burn
    await instance.connect(owner).createGameItem(
      "Test Item",
      "ipfs://test",
      false,  // finiteSupply
      true,   // transferable
      100,    // itemsRemaining
      ethers.parseEther("1"), // itemPrice
      10      // dailyAllowance
    );

    // Mint tokens to addr2 so they have tokens to burn
    // We need to set up a Neuron contract for minting, but since burn doesn't require minting,
    // we can directly mint via ERC1155 internal function by having owner mint
    // Actually, let's use the burn function directly - we need tokens in addr2's balance
    // Owner can mint to addr2 using the internal _mint path through the public mint function
    // But mint requires Neuron contract - let's take a different approach

    // We need to first instantiate a Neuron contract and give addr2 tokens
    // Deploy Neuron contract
    const NeuronFactory = await ethers.getContractFactory("Neuron");
    const neuronInstance = await NeuronFactory.deploy(
      owner.address,
      treasuryAddress,
      addr2.address
    );
    await neuronInstance.waitForDeployment();

    // Instantiate Neuron contract in GameItems
    await instance.connect(owner).instantiateNeuronContract(await neuronInstance.getAddress());

    // Give addr2 some NRN tokens to buy game items
    // Addr2 already got INITIAL_CONTRIBUTOR_MINT tokens from Neuron constructor
    // Now mint tokens to addr2 in GameItems by calling mint
    await instance.connect(addr2).mint(0, 1);

    // Now try to burn tokens from addr2 using an unauthorized address (addr1)
    // The mutant removed the require(allowedBurningAddresses[msg.sender]) check
    // So this should NOT revert in the mutant, but SHOULD revert in the original
    await expect(
      instance.connect(addr1).burn(addr2.address, 0, 1)
    ).to.be.reverted;

    // Verify the tokens were NOT burned (since we expect revert in original)
    const balanceAfter = await instance.balanceOf(addr2.address, 0);
    expect(balanceAfter).to.equal(1);
  });
});