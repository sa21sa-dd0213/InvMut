import { expect } from "chai";
import { ethers } from "hardhat";

describe("PhiNFT1155 - kill mutant m2d81db30 (createArtFromFactory msg.value+1)", function () {
  it("should revert when trying to refund more ETH than received", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy PhiNFT1155 (constructor has no arguments, uses _disableInitializers)
    const Factory = await ethers.getContractFactory("PhiNFT1155");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // We need to initialize the contract first
    // The initialize function requires: credChainId, credId, verificationType, protocolFeeDestination
    // We need a protocolFeeDestination that has ETH for the refund later
    // Deploy a simple mock for the phiFactoryContract (since we can't call createArtFromFactory without it)
    // But actually we need to test the mutated line: _msgSender().safeTransferETH(msg.value+1 - artFee)
    // The mutation adds 1 to msg.value before subtracting artFee
    
    // We need to call createArtFromFactory which is onlyPhiFactory
    // So we need to set phiFactoryContract address to something we control
    // The function is only callable by phiFactoryContract
    
    // Let's first initialize the contract
    const protocolFeeDest = addr1.address;
    await instance.initialize(
      1, // credChainId
      1, // credId
      "test", // verificationType
      protocolFeeDest
    );
    
    // Now we need to set the phiFactoryContract to a contract we control
    // We can deploy a simple contract that can call createArtFromFactory
    const FactoryCaller = await ethers.getContractFactory("PhiNFT1155");
    // Actually, we can use the fact that phiFactoryContract is set during initialization to msg.sender
    // Since owner called initialize, phiFactoryContract = owner.address
    // But owner is an EOA, not a contract - we need a contract to call createArtFromFactory
    
    // Let's deploy a minimal proxy that forwards calls
    const MinimalFactory = await ethers.getContractFactory(
      "contracts/test/PhiFactoryMock.sol:PhiFactoryMock"
    );
    // If that doesn't exist, we can create a simple factory inline
    
    // Alternative approach: test the ETH refund logic directly
    // The mutation affects: _msgSender().safeTransferETH(msg.value+1 - artFee)
    // When msg.value == artFee, the original sends 0, but mutant sends 1 wei
    // This will revert because the contract doesn't have enough ETH
    
    // We can test this by calling initialize which sets phiFactoryContract to owner
    // Then we need to make owner be a contract that can call createArtFromFactory
    
    // Simpler approach: deploy a minimal contract that calls createArtFromFactory
    const factoryCode = `
      contract FactoryMock {
        function callCreateArt(PhiNFT1155 nft, uint256 artId) external payable returns (uint256) {
          return nft.createArtFromFactory{value: msg.value}(artId);
        }
      }
    `;
    
    const FactoryMock = await ethers.getContractFactory(factoryCode);
    const factoryMock = await FactoryMock.deploy();
    await factoryMock.waitForDeployment();
    
    // Re-initialize with factoryMock as the phiFactoryContract
    // But initialize can only be called once... 
    // We need a fresh deployment
    const instance2 = await Factory.deploy();
    await instance2.waitForDeployment();
    
    // Set phiFactoryContract to our mock via initialize
    // initialize sets phiFactoryContract = msg.sender
    // So we need our mock to call initialize
    // This is getting complex - let's use a different approach
    
    // Actually, we can test the mutation by deploying a fresh contract
    // and making the owner (EOA) be the phiFactoryContract
    // Then call createArtFromFactory from the owner EOA
    // But createArtFromFactory is not payable from EOA - it requires onlyPhiFactory modifier
    // which checks msg.sender == address(phiFactoryContract)
    
    // Let's deploy a simple contract that acts as the factory
    const FactoryCallerContract = await ethers.deployContract(
      "contracts/test/PhiNFT1155FactoryCaller.sol:PhiNFT1155FactoryCaller",
      []
    );
    // If that doesn't exist, let's create a minimal one
    
    // Minimal approach: deploy PhiNFT1155, initialize with a contract as phiFactory
    const callerCode = `
      contract Caller {
        function callCreateArt(address nft, uint256 artId) external payable returns (uint256) {
          (bool success, bytes memory data) = nft.call{value: msg.value}(
            abi.encodeWithSignature("createArtFromFactory(uint256)", artId)
          );
          require(success, "call failed");
          return abi.decode(data, (uint256));
        }
      }
    `;
    
    const CallerFactory = await ethers.getContractFactory(callerCode);
    const caller = await CallerFactory.deploy();
    await caller.waitForDeployment();
    
    // Now deploy PhiNFT1155 and initialize with caller as phiFactoryContract
    const instance3 = await Factory.deploy();
    await instance3.waitForDeployment();
    
    // initialize sets phiFactoryContract = msg.sender
    // We need caller to be msg.sender when initialize is called
    // So caller must call initialize on instance3
    const initData = instance3.interface.encodeFunctionData("initialize", [
      1, 1, "test", protocolFeeDest
    ]);
    await owner.sendTransaction({
      to: await caller.getAddress(),
      data: initData
    });
    // Actually this won't work because caller needs to call initialize directly
    
    // Let's take a step back and use a simpler test approach
    // The key insight: when msg.value == artFee, original sends 0 ETH, mutant sends 1 ETH
    // The contract balance must be >= amount to send, or it reverts
    // So if we set up the test so contract has exactly artFee, the original works but mutant reverts
    
    // Deploy fresh
    const nft = await Factory.deploy();
    await nft.waitForDeployment();
    
    // Initialize with owner as phiFactoryContract
    await nft.initialize(1, 1, "test", protocolFeeDest);
    
    // Now phiFactoryContract = owner
    // We need to call createArtFromFactory as owner (which is phiFactoryContract)
    // But owner is an EOA, so we can call it directly
    // However createArtFromFactory is payable and has onlyPhiFactory modifier
    
    // The mutation: _msgSender().safeTransferETH(msg.value+1 - artFee)
    // We need to trigger this line with msg.value == artFee so it tries to send 1 wei extra
    
    // First we need artCreateFee to be something we can match
    // artCreateFee comes from phiFactoryContract.artCreateFee()
    // Since phiFactoryContract = owner (EOA), this call will fail because EOA has no code
    
    // This is a fundamental issue - we need phiFactoryContract to be a real contract
    // Let's deploy a minimal factory mock that returns a fixed artCreateFee
    
    const mockFactoryCode = `
      contract MockFactory {
        uint256 public artCreateFee = 0.1 ether;
        function protocolFeeDestination() external view returns (address) {
          return address(0xdead);
        }
        function artData(uint256) external view returns (uint256, address, uint256, string memory, string memory, address, address, address, uint256, uint256, uint256, uint256, uint256, bool) {
          // Return dummy art data
          return (0, address(0), 0, "", "", address(0), address(0), address(0), 0, 0, 0, 0, 0, false);
        }
        function artCreateFee() external view returns (uint256) {
          return 0.1 ether;
        }
        function phiRewardsAddress() external view returns (address) {
          return address(0);
        }
      }
    `;
    
    const MockFactory = await ethers.getContractFactory(mockFactoryCode);
    const mockFactory = await MockFactory.deploy();
    await mockFactory.waitForDeployment();
    
    // Deploy new nft
    const nft2 = await Factory.deploy();
    await nft2.waitForDeployment();
    
    // Initialize with mockFactory as phiFactoryContract
    // But initialize sets phiFactoryContract = msg.sender
    // So we need mockFactory to call initialize
    // Let's add a function to mockFactory that calls initialize
    
    // This is getting too complex. Let's use a different approach:
    // We can directly set the storage slot for phiFactoryContract using storage manipulation
    
    // Even simpler: just test the ETH transfer logic by checking that
    // when msg.value == artFee, the transaction should succeed (original) or revert (mutant)
    
    // The cleanest test: deploy nft, initialize with a contract factory, 
    // then call createArtFromFactory with msg.value == artFee
    // Original: refunds 0, works fine
    // Mutant: tries to refund 1 wei, reverts because contract has no ETH
    
    // Let's build the mock factory with an initialize function
    const fullMockCode = `
      contract FullMockFactory {
        function initialize(address nft, uint256 credChainId, uint256 credId, string memory verificationType, address protocolFeeDest) external {
          (bool success, ) = nft.call(
            abi.encodeWithSignature("initialize(uint256,uint256,string,address)", 
              credChainId, credId, verificationType, protocolFeeDest)
          );
          require(success, "init failed");
        }
        function callCreateArt(address nft, uint256 artId) external payable returns (uint256) {
          (bool success, bytes memory data) = nft.call{value: msg.value}(
            abi.encodeWithSignature("createArtFromFactory(uint256)", artId)
          );
          require(success, "create failed");
          return abi.decode(data, (uint256));
        }
        function artCreateFee() external pure returns (uint256) { return 1 ether; }
        function protocolFeeDestination() external pure returns (address) { return address(0xdead); }
        function phiRewardsAddress() external pure returns (address) { return address(0); }
        function artData(uint256) external pure returns (uint256, address, uint256, string memory, string memory, address, address, address, uint256, uint256, uint256, uint256, uint256, bool) {
          return (0, address(0), 0, "", "", address(0), address(0), address(0), 0, 0, 0, 0, 0, false);
        }
      }
    `;
    
    const FullMockFactory = await ethers.getContractFactory(fullMockCode);
    const fullMock = await FullMockFactory.deploy();
    await fullMock.waitForDeployment();
    
    // Deploy nft
    const nft3 = await Factory.deploy();
    await nft3.waitForDeployment();
    
    // Have mock factory initialize the nft
    await fullMock.initialize(
      await nft3.getAddress(),
      1, 1, "test",
      protocolFeeDest
    );
    
    // Now phiFactoryContract on nft3 = address(fullMock)
    // Call createArtFromFactory with msg.value = artFee (1 ether)
    // The protocolFeeDest needs to receive ETH - let's send some to nft3 first
    await owner.sendTransaction({
      to: await nft3.getAddress(),
      value: ethers.parseEther("10")
    });
    
    // Now call createArtFromFactory with exactly 1 ether
    // Original: refunds 0 (1 - 1 = 0), works fine
    // Mutant: tries to refund 1 wei (1 + 1 - 1 = 1), should revert
    const tx = fullMock.callCreateArt(
      await nft3.getAddress(),
      1,
      { value: ethers.parseEther("1") }
    );
    
    // The mutation causes the contract to try to send 1 wei more than it should
    // This should revert with "ETHTransferFailed" or similar
    await expect(tx).to.be.reverted;
  });
});