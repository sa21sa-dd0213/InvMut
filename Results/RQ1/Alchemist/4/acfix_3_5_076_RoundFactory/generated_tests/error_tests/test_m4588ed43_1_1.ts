import { expect } from "chai";
import { ethers } from "hardhat";

describe("RoundFactory mutant detection - m4588ed43", function () {
  it("should return the clone address from create function", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy RoundFactory (no constructor arguments needed as it uses initializer)
    const Factory = await ethers.getContractFactory("RoundFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Initialize the factory
    await instance.initialize();

    // Set up a mock round implementation (any contract with initialize function)
    const MockRound = await ethers.getContractFactory("RoundFactory");
    const mockRound = await MockRound.deploy();
    await mockRound.waitForDeployment();

    // Deploy a mock AlloSettings
    const MockAlloSettings = await ethers.getContractFactory("RoundFactory");
    const mockAlloSettings = await MockAlloSettings.deploy();
    await mockAlloSettings.waitForDeployment();

    // Configure the factory
    await instance.updateRoundImplementation(await mockRound.getAddress());
    await instance.updateAlloSettings(await mockAlloSettings.getAddress());

    // Add addr1 as program operator
    await instance.addProgramOperator(addr1.address);

    // Prepare encoded parameters (empty bytes for simplicity)
    const encodedParameters = ethers.hexlify(ethers.toUtf8Bytes(""));

    // Call create from program operator
    const tx = await instance.connect(addr1).create(encodedParameters, addr2.address);
    const receipt = await tx.wait();

    // Get the return value from the transaction
    const iface = new ethers.Interface(["function create(bytes calldata, address) external returns (address)"]);
    const decodedData = iface.decodeFunctionResult("create", receipt.logs[0].data);
    const returnedAddress = decodedData[0];

    // Assert that the returned address is not zero address
    expect(returnedAddress).to.not.equal(ethers.ZeroAddress);

    // Also verify it's a contract
    const code = await ethers.provider.getCode(returnedAddress);
    expect(code).to.not.equal("0x");
  });
});